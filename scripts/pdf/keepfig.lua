-- Layout fixes applied when rendering the capstone report.
--
-- 1. Pandoc 3 turns an image-only paragraph into a floating Figure, which drifts
--    away from the report's own "**Figure N** — ..." caption paragraph. Unfloat
--    the image and bind it to that caption inside a minipage, which cannot break
--    across a page. (LaTeX output only; other writers just get the image.)
-- 2. A markdown "---" sitting immediately before a chapter heading becomes a rule
--    stranded between two forced page breaks, wasting a whole page. Chapters
--    already start on a fresh page, so drop those rules.

local function caption_para(b)
  if not b or b.t ~= "Para" then return false end
  local first = b.content[1]
  if not first or first.t ~= "Strong" then return false end
  return pandoc.utils.stringify(first):match("^Figure%s") ~= nil
end

-- the image blocks inside a Figure, discarding pandoc's auto-caption
local function figure_body(fig)
  local out = pandoc.List()
  for _, blk in ipairs(fig.content) do out:insert(blk) end
  return out
end

local function drop_separator_rules(blocks)
  local out = pandoc.List()
  for i, b in ipairs(blocks) do
    local nxt = blocks[i + 1]
    local stranded = b.t == "HorizontalRule"
      and ((nxt and nxt.t == "Header") or nxt == nil)
    if not stranded then out:insert(b) end
  end
  return out
end


-- The title page. In LaTeX it becomes a centred, unnumbered page with the project
-- name set large; every other writer (docx) just gets the blocks as written, so
-- Word and Google Docs still show a plain, correct title page.
function Div(el)
  if not el.classes:includes("titlepage") then return nil end

  -- Word/Google Docs: keep the blocks as written, but end the page here so the
  -- document body still starts on page 2. \newpage is LaTeX-only.
  if not FORMAT:match("latex") then
    local out = pandoc.List(el.content)
    if FORMAT:match("docx") then
      out:insert(pandoc.RawBlock("openxml",
        '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'))
    end
    return out
  end

  -- A plain title page: logo, project name, subtitle, then the details table
  -- with labels left and values right. Nothing decorative.
  local out = pandoc.List()
  local function raw(t) out:insert(pandoc.RawBlock("latex", t)) end
  raw("\\begin{titlepage}\\thispagestyle{empty}\\vspace*{1.5cm}\\begin{center}")

  for _, b in ipairs(el.content) do
    local txt = pandoc.utils.stringify(b)
    local is_img = b.t == "Figure"
      or (b.t == "Para" and #b.content == 1 and b.content[1].t == "Image")

    if is_img then
      local img = (b.t == "Figure") and b.content[1].content[1] or b.content[1]
      raw("\\includegraphics[width=2.4cm]{" .. img.src .. "}\\par\\vspace{1.1cm}")
    elseif b.t == "Header" and b.level == 1 then
      raw("{\\fontsize{30}{36}\\selectfont\\bfseries " .. txt .. "}\\par\\vspace{0.3cm}")
    elseif b.t == "Header" then
      raw("{\\fontsize{14}{19}\\selectfont " .. txt .. "}\\par\\vspace{0.9cm}")
    elseif txt:match("FINAL DOCUMENTATION") then
      raw("{\\fontsize{12}{16}\\selectfont\\bfseries " .. txt .. "}\\par\\vspace{1.4cm}")
    elseif b.t == "Table" then
      raw("\\end{center}\\setstretch{1.3}")
      out:insert(b)
      raw("\\begin{center}")
    else
      out:insert(b)
    end
  end
  raw("\\end{center}\\end{titlepage}")
  return out
end

function Blocks(blocks)
  local out = pandoc.List()
  local i = 1
  while i <= #blocks do
    local b = blocks[i]
    if b.t == "Figure" then
      if FORMAT:match("latex") then
        out:insert(pandoc.RawBlock("latex",
          "\\begin{minipage}{\\linewidth}\\centering\\vspace{4pt}"))
      end
      out:extend(figure_body(b))
      if caption_para(blocks[i + 1]) then
        out:insert(blocks[i + 1])
        i = i + 1
      end
      if FORMAT:match("latex") then
        out:insert(pandoc.RawBlock("latex", "\\vspace{4pt}\\end{minipage}\\par"))
      end
    else
      out:insert(b)
    end
    i = i + 1
  end
  return drop_separator_rules(out)
end
