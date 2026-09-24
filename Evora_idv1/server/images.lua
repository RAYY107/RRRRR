--[[
    Evora ID — external image validation
    ------------------------------------------------------------------
    Nothing a client sends is trusted:
      * HTTPS only, structural URL check (shared/schema.lua)
      * host allow-list (Config.Images.AllowedHosts)
      * file extension allow-list
      * a real HTTP request (HEAD, falling back to a 32-byte ranged GET)
        confirming an image content type / magic bytes and the size limit
      * results cached, so the same URL is never re-checked repeatedly

    Discord user ids are resolved to avatar URLs here, with the bot token
    read from a server convar. The token never leaves the server.
]]

Images = {}

local U = EvoraUtils
local urlCache = {}
local discordCache = {}
local TIMEOUT_MS = 8000

local MIME = {
    ['image/png'] = 'png', ['image/jpeg'] = 'jpg', ['image/jpg'] = 'jpg',
    ['image/webp'] = 'webp', ['image/gif'] = 'gif',
}

local function lowerHeaders(h)
    local out = {}
    if type(h) == 'table' then
        for k, v in pairs(h) do out[tostring(k):lower()] = v end
    end
    return out
end

local function hostOf(url)
    local host = url:match('^https://([^/:?#]+)')
    return host and host:lower() or nil
end

local function extOf(url)
    local path = url:match('^https://[^/?#]+(/[^?#]*)') or ''
    local ext = path:match('%.([%w]+)$')
    return ext and ext:lower() or nil
end

local function hostAllowed(host)
    if Config.Images.AllowAnyHost then return true end
    for _, allowed in ipairs(Config.Images.AllowedHosts or {}) do
        allowed = allowed:lower()
        if host == allowed or host:sub(-(#allowed + 1)) == '.' .. allowed then return true end
    end
    return false
end

local function sniff(bytes)
    if type(bytes) ~= 'string' or #bytes < 4 then return nil end
    if bytes:sub(1, 8) == '\137PNG\r\n\26\n' then return 'png' end
    if bytes:sub(1, 3) == '\255\216\255' then return 'jpg' end
    if bytes:sub(1, 4) == 'GIF8' then return 'gif' end
    if bytes:sub(1, 4) == 'RIFF' and bytes:sub(9, 12) == 'WEBP' then return 'webp' end
    return nil
end

-- PerformHttpRequest with a timeout, as a synchronous call inside a thread.
local function http(url, method, headers, body)
    local p = promise.new()
    local done = false
    PerformHttpRequest(url, function(status, data, respHeaders)
        if done then return end
        done = true
        p:resolve({ status = tonumber(status) or 0, data = data, headers = lowerHeaders(respHeaders) })
    end, method or 'GET', body or '', headers or {})
    SetTimeout(TIMEOUT_MS, function()
        if not done then
            done = true
            p:resolve({ status = 0, timeout = true, headers = {} })
        end
    end)
    return Citizen.Await(p)
end

local function sizeFrom(headers)
    local range = headers['content-range']
    if range then
        local total = tostring(range):match('/(%d+)$')
        if total then return tonumber(total) end
    end
    return tonumber(headers['content-length'])
end

local function probe(url)
    local res = http(url, 'HEAD')
    local kind = MIME[(tostring(res.headers['content-type'] or ''):match('^[^;]+') or ''):lower()]
    local size = sizeFrom(res.headers)

    if res.status < 200 or res.status >= 300 or not kind then
        -- some hosts refuse HEAD; ask for the first bytes instead
        local get = http(url, 'GET', { Range = 'bytes=0-31' })
        if get.timeout then return nil, 'timeout' end
        if get.status ~= 200 and get.status ~= 206 then return nil, 'unreachable' end
        kind = sniff(get.data) or MIME[(tostring(get.headers['content-type'] or ''):match('^[^;]+') or ''):lower()]
        size = sizeFrom(get.headers) or size
        if get.status == 200 and not size and type(get.data) == 'string' then size = #get.data end
    end
    if res.timeout and not kind then return nil, 'timeout' end
    if not kind then return nil, 'not_image' end
    return { kind = kind, size = size }
end

--[[
    Images.validateUrl(url, trusted) -> ok, reasonOrInfo
    `trusted` skips the host allow-list for URLs built by the server
    itself (Discord avatars). Must be called from a thread.
]]
function Images.validateUrl(url, trusted)
    if not Config.Images.Enabled then return false, 'images_disabled' end
    if type(url) ~= 'string' or #url > (Config.Images.MaxUrlLength or 512) then return false, 'invalid_url' end
    if not EvoraSchema.checkUrl(url) or url == '' then return false, 'invalid_url' end

    local host = hostOf(url)
    if not host then return false, 'invalid_url' end
    if not trusted and not hostAllowed(host) then return false, 'host_not_allowed' end

    local ext = extOf(url)
    if ext and not U.indexOf(Config.Images.Extensions, ext) then return false, 'bad_extension' end

    local cached = urlCache[url]
    if cached and os.time() - cached.at < (Config.Images.CacheSeconds or 21600) then
        return cached.ok, cached.info
    end

    local info, err = probe(url)
    local ok, result = false, err
    if info then
        if info.kind == 'gif' and not Config.Images.AllowGif then
            ok, result = false, 'gif_not_allowed'
        elseif info.size and info.size > (Config.Images.MaxBytes or 4194304) then
            ok, result = false, 'too_large'
        else
            ok, result = true, info
        end
    end
    -- failed network checks are cached briefly so a flaky host can recover
    urlCache[url] = { ok = ok, info = result, at = ok and os.time() or (os.time() - (Config.Images.CacheSeconds or 21600) + 120) }
    return ok, result
end

local function defaultAvatar(id)
    local n = math.tointeger(tonumber(id))
    local index = n and ((n >> 22) % 6) or 0
    return ('https://cdn.discordapp.com/embed/avatars/%d.png'):format(index)
end

--[[
    Images.resolveDiscord(userId) -> url or nil, err
    Must be called from a thread.
]]
function Images.resolveDiscord(userId)
    if not Config.Images.AllowDiscord then return nil, 'discord_disabled' end
    if type(userId) ~= 'string' or not userId:match('^%d+$') or #userId < 17 or #userId > 20 then
        return nil, 'invalid_discord_id'
    end
    local refresh = (Config.Images.Discord.RefreshHours or 24) * 3600
    local cached = discordCache[userId]
    if cached and os.time() - cached.at < refresh then return cached.url end

    local token = GetConvar(Config.Images.Discord.TokenConvar or 'evora_discord_bot_token', '')
    local url
    if token ~= '' then
        local res = http('https://discord.com/api/v10/users/' .. userId, 'GET', { Authorization = 'Bot ' .. token })
        if res.status == 200 and type(res.data) == 'string' then
            local ok, user = pcall(json.decode, res.data)
            if ok and type(user) == 'table' then
                if type(user.avatar) == 'string' and user.avatar:match('^[%w_]+$') then
                    local animated = user.avatar:sub(1, 2) == 'a_' and Config.Images.AllowGif
                    url = ('https://cdn.discordapp.com/avatars/%s/%s.%s?size=%d'):format(
                        userId, user.avatar, animated and 'gif' or 'png', Config.Images.Discord.AvatarSize or 256)
                else
                    url = defaultAvatar(userId)
                end
            end
        elseif res.status == 404 then
            return nil, 'discord_user_not_found'
        elseif res.status == 401 then
            U.warn('Discord bot token rejected (convar %s). Falling back to default avatars.', Config.Images.Discord.TokenConvar)
        end
    end
    url = url or defaultAvatar(userId)
    discordCache[userId] = { url = url, at = os.time() }
    return url
end

--[[
    Server-side image checks for a sanitized design (mutates it).
    Returns ok, errorKey. Must be called from a thread.
]]
function Images.checkDesign(design)
    local img = design and design.image
    if not img or not img.on then return true end
    if not Config.Images.Enabled then return false, 'images_disabled' end

    if img.kind == 'asset' then
        if EvoraAssets.ById[img.asset] then return true end
        return false, 'invalid_asset'
    elseif img.kind == 'url' then
        if not Config.Images.AllowUrl then return false, 'url_disabled' end
        local ok, err = Images.validateUrl(img.url, false)
        if not ok then return false, err end
        return true
    elseif img.kind == 'discord' then
        local url, err = Images.resolveDiscord(img.discord)
        if not url then return false, err end
        img.url = url
        local ok, verr = Images.validateUrl(url, true)
        if not ok then return false, verr end
        return true
    end
    return false, 'invalid_image'
end

-- Periodically refresh a stored Discord avatar (avatars change).
function Images.refreshDiscord(design)
    local img = design and design.image
    if not (img and img.on and img.kind == 'discord') then return false end
    local url = Images.resolveDiscord(img.discord)
    if url and url ~= img.url then
        img.url = url
        return true
    end
    return false
end
