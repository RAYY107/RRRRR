-- Minimal JSON for the offline test harness (FiveM provides `json` at runtime).
local json = {}
local function kind(t)
  if next(t) == nil then return 'array' end
  local n = #t
  for k in pairs(t) do if type(k) ~= 'number' or k < 1 or k > n or k % 1 ~= 0 then return 'object' end end
  return 'array'
end
local esc = { ['"']='\\"', ['\\']='\\\\', ['\b']='\\b', ['\f']='\\f', ['\n']='\\n', ['\r']='\\r', ['\t']='\\t' }
local function enc(v, out)
  local t = type(v)
  if t == 'nil' then out[#out+1] = 'null'
  elseif t == 'boolean' then out[#out+1] = tostring(v)
  elseif t == 'number' then
    if math.type(v) == 'integer' then out[#out+1] = string.format('%d', v) else out[#out+1] = string.format('%.14g', v) end
  elseif t == 'string' then out[#out+1] = '"' .. v:gsub('[%c"\\]', function(c) return esc[c] or string.format('\\u%04x', c:byte()) end) .. '"'
  elseif t == 'table' then
    if kind(v) == 'array' then
      out[#out+1] = '['
      for i = 1, #v do if i > 1 then out[#out+1] = ',' end enc(v[i], out) end
      out[#out+1] = ']'
    else
      out[#out+1] = '{'
      local first = true
      for k, x in pairs(v) do
        if not first then out[#out+1] = ',' end
        first = false
        enc(tostring(k), out); out[#out+1] = ':'; enc(x, out)
      end
      out[#out+1] = '}'
    end
  else error('cannot encode ' .. t) end
end
function json.encode(v) local out = {} enc(v, out) return table.concat(out) end
local function skip(s, i) return s:find('[^ \t\r\n]', i) or #s + 1 end
local dec
local function decstr(s, i)
  local out, j = {}, i + 1
  while true do
    local c = s:sub(j, j)
    if c == '' then error('unterminated string') end
    if c == '"' then return table.concat(out), j + 1 end
    if c == '\\' then
      local n = s:sub(j + 1, j + 1)
      local map = { b='\b', f='\f', n='\n', r='\r', t='\t', ['"']='"', ['\\']='\\', ['/']='/' }
      if n == 'u' then out[#out+1] = utf8.char(tonumber(s:sub(j + 2, j + 5), 16)); j = j + 6
      else out[#out+1] = map[n]; j = j + 2 end
    else out[#out+1] = c; j = j + 1 end
  end
end
dec = function(s, i)
  i = skip(s, i)
  local c = s:sub(i, i)
  if c == '{' then
    local t = {}; i = skip(s, i + 1)
    if s:sub(i, i) == '}' then return t, i + 1 end
    while true do
      local k; k, i = decstr(s, skip(s, i)); i = skip(s, i)
      assert(s:sub(i, i) == ':', 'expected :'); local v; v, i = dec(s, i + 1); t[k] = v; i = skip(s, i)
      local d = s:sub(i, i); if d == '}' then return t, i + 1 end
      assert(d == ',', 'expected ,'); i = i + 1
    end
  elseif c == '[' then
    local t = {}; i = skip(s, i + 1)
    if s:sub(i, i) == ']' then return t, i + 1 end
    while true do
      local v; v, i = dec(s, i); t[#t + 1] = v; i = skip(s, i)
      local d = s:sub(i, i); if d == ']' then return t, i + 1 end
      assert(d == ',', 'expected ,'); i = i + 1
    end
  elseif c == '"' then return decstr(s, i)
  elseif s:sub(i, i + 3) == 'true' then return true, i + 4
  elseif s:sub(i, i + 4) == 'false' then return false, i + 5
  elseif s:sub(i, i + 3) == 'null' then return nil, i + 4
  else
    local num = s:match('^-?%d+%.?%d*[eE]?[-+]?%d*', i)
    assert(num and #num > 0, 'bad json at ' .. i)
    return math.tointeger(tonumber(num)) or tonumber(num), i + #num
  end
end
function json.decode(s) local v = dec(s, 1) return v end
return json
