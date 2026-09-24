--[[
    Evora ID — online state and synchronisation
    ------------------------------------------------------------------
    State.players[src]  online player: owner key, name, design record
    State.active[src]   the design everyone currently sees for that
                        server id (nil = default look)

    Sync model
      * a joining client receives one snapshot (latent event)
      * every change is broadcast as a small delta
      * a global sequence number orders snapshot vs. deltas, so a slow
        snapshot can never overwrite a newer change
    Keys are always the live FiveM server id. Designs never carry an id.
]]

State = {
    players = {},
    active = {},
    seq = 0,
    ownerIndex = {},   -- owner key -> src
}

local U = EvoraUtils
local E = EvoraConst.Events

local defaultCache = { version = -1, design = nil }

-- Default look for players without a design (resolved on the server so
-- manager presets can be used as the default too).
function State.defaultDesign()
    if defaultCache.version ~= Presets.version then
        defaultCache.version = Presets.version
        defaultCache.design = Config.DefaultPreset and Presets.designOf(Config.DefaultPreset) or nil
    end
    return defaultCache.design
end

local function nextSeq()
    State.seq = State.seq + 1
    return State.seq
end

--[[
    record = {
      design, hash, presetId, mode ('permanent'|'temporary'), expiresAt,
      locked, lastSelfSave, updatedAt, exists (row exists in DB)
    }
]]
function State.status(record, now)
    now = now or os.time()
    if not record or not record.design then return EvoraConst.Status.None end
    if record.mode == 'temporary' then
        if record.expiresAt and record.expiresAt <= now then return EvoraConst.Status.Expired end
        return EvoraConst.Status.Temporary
    end
    return EvoraConst.Status.Permanent
end

-- The design that should currently be visible, or nil.
function State.effective(record, now)
    local st = State.status(record, now)
    if st == 'permanent' or st == 'temporary' then return record.design end
    return nil
end

function State.cooldownRemaining(record, now)
    if not Config.Cooldown.Enabled or not record or not record.lastSelfSave then return 0 end
    local left = record.lastSelfSave + (Config.Cooldown.Seconds or 0) - (now or os.time())
    return left > 0 and left or 0
end

-- Recompute what everyone sees for `src` and broadcast when it changed.
function State.refresh(src)
    local p = State.players[src]
    local design = p and p.ready and State.effective(p.record) or nil
    local hash = design and (p.record.hash or U.designHash(design)) or nil
    local current = State.active[src]
    local currentHash = current and current.hash or nil
    if hash == currentHash then return false end

    local seq = nextSeq()
    if design then
        State.active[src] = { hash = hash, design = design, seq = seq }
    else
        State.active[src] = nil
    end
    TriggerClientEvent(E.Update, -1, src, seq, hash, design)
    return true
end

function State.remove(src)
    if State.active[src] then
        State.active[src] = nil
        TriggerClientEvent(E.Update, -1, src, nextSeq(), nil, nil)
    end
    local p = State.players[src]
    if p and p.owner and State.ownerIndex[p.owner] == src then
        State.ownerIndex[p.owner] = nil
    end
    State.players[src] = nil
end

function State.sendSnapshot(src)
    local designs, players = {}, {}
    for id, a in pairs(State.active) do
        designs[a.hash] = a.design
        players[#players + 1] = { id, a.hash, a.seq }
    end
    TriggerLatentClientEvent(E.Snapshot, src, 256000, {
        seq = State.seq,
        default = State.defaultDesign(),
        designs = designs,
        players = players,
    })
end

-- Re-send the default look to everyone (preset catalogue changed).
function State.broadcastDefault()
    TriggerClientEvent(E.Update, -1, 0, nextSeq(), 'default', State.defaultDesign())
end

function State.bySource(src)
    return State.players[tonumber(src) or -1]
end

function State.byOwner(owner)
    local src = State.ownerIndex[owner]
    if src and State.players[src] then return State.players[src], src end
    return nil
end
