export function printMultiPageReport(reportContent: string) {
  if (!reportContent) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download the PDF report.");
    return;
  }

  const rawPages = reportContent.split("<!-- PAGE_BREAK -->").filter(Boolean);

  function formatMarkdownToHtml(markdown: string): string {
    const lines = markdown.split("\n");
    const out: string[] = [];
    let inTable = false;
    let isHeaderRow = true;
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (!line) {
        if (inTable) {
          out.push("</tbody></table>");
          inTable = false;
        }
        if (inList) {
          out.push("</ul>");
          inList = false;
        }
        continue;
      }

      // Headers
      if (line.startsWith("# ")) {
        if (inTable) { out.push("</tbody></table>"); inTable = false; }
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h1 class="page-title">${formatInline(line.slice(2))}</h1>`);
        continue;
      }
      if (line.startsWith("## ")) {
        if (inTable) { out.push("</tbody></table>"); inTable = false; }
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h2 class="section-title">${formatInline(line.slice(3))}</h2>`);
        continue;
      }
      if (line.startsWith("### ")) {
        if (inTable) { out.push("</tbody></table>"); inTable = false; }
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h3 class="subsection-title">${formatInline(line.slice(4))}</h3>`);
        continue;
      }

      // Horizontal Rule
      if (line === "---") {
        if (inTable) { out.push("</tbody></table>"); inTable = false; }
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<hr class="divider" />`);
        continue;
      }

      // Tables
      if (line.startsWith("|") && line.endsWith("|")) {
        const cells = line
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        // Check if it's separator line |:---|:---|
        if (cells.every((c) => c.match(/^:?-+:?$/))) {
          isHeaderRow = false;
          continue;
        }

        if (!inTable) {
          inTable = true;
          isHeaderRow = true;
          out.push('<table class="data-table"><thead><tr>');
          cells.forEach((cell) => out.push(`<th>${formatInline(cell)}</th>`));
          out.push("</tr></thead><tbody>");
        } else if (isHeaderRow) {
          out.push("<tr>");
          cells.forEach((cell) => out.push(`<th>${formatInline(cell)}</th>`));
          out.push("</tr>");
        } else {
          out.push("<tr>");
          cells.forEach((cell) => out.push(`<td>${formatInline(cell)}</td>`));
          out.push("</tr>");
        }
        continue;
      } else if (inTable) {
        out.push("</tbody></table>");
        inTable = false;
      }

      // Checklist item
      if (line.startsWith("- [ ]") || line.startsWith("- [x]")) {
        if (!inList) {
          inList = true;
          out.push('<ul class="checklist">');
        }
        const isChecked = line.startsWith("- [x]");
        const text = line.slice(5).trim();
        out.push(`<li><span class="checkbox">${isChecked ? "☑" : "☐"}</span> ${formatInline(text)}</li>`);
        continue;
      }

      // Bullet lists
      if (line.startsWith("* ") || line.startsWith("- ")) {
        if (!inList) {
          inList = true;
          out.push('<ul class="bullet-list">');
        }
        out.push(`<li>${formatInline(line.slice(2))}</li>`);
        continue;
      } else if (inList) {
        out.push("</ul>");
        inList = false;
      }

      // Numbered lists
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        out.push(`<p class="num-item"><span class="num">${numMatch[1]}.</span> ${formatInline(numMatch[2])}</p>`);
        continue;
      }

      // Paragraph
      out.push(`<p class="body-text">${formatInline(line)}</p>`);
    }

    if (inTable) out.push("</tbody></table>");
    if (inList) out.push("</ul>");

    return out.join("\n");
  }

  function formatInline(text: string): string {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, '<code class="code-badge">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>UES Platform - Multi-Platform Executive Intelligence Report</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #FFFFFF;
            color: #1F2937;
            line-height: 1.55;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .page {
            width: 100%;
            min-height: 100vh;
            padding: 40px 48px;
            page-break-after: always;
            break-after: page;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #FFFFFF;
            border-bottom: 2px solid #E5E7EB;
          }

          @media print {
            .page {
              padding: 24px 32px;
              min-height: 100vh;
              page-break-after: always;
              break-after: page;
              border-bottom: none;
            }
            body {
              background: #FFFFFF !important;
              color: #1F2937 !important;
            }
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0F766E;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }

          .logo {
            font-size: 18px;
            font-weight: 800;
            color: #0F766E;
            letter-spacing: -0.5px;
          }

          .date {
            font-size: 11px;
            font-weight: 600;
            color: #6B7280;
            font-family: 'JetBrains Mono', monospace;
          }

          .page-title {
            font-size: 20px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 16px;
            letter-spacing: -0.4px;
          }

          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: #0F766E;
            margin-top: 18px;
            margin-bottom: 10px;
          }

          .subsection-title {
            font-size: 13px;
            font-weight: 700;
            color: #B91C1C;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 14px;
            margin-bottom: 6px;
          }

          .body-text, .bullet-list li, .checklist li, .num-item {
            font-size: 12.5px;
            color: #374151;
            margin-bottom: 6px;
          }

          .bullet-list, .checklist {
            margin-left: 20px;
            margin-bottom: 12px;
          }

          .num-item {
            display: flex;
            gap: 8px;
            margin-bottom: 6px;
          }

          .num {
            font-weight: 700;
            color: #0F766E;
            font-family: 'JetBrains Mono', monospace;
          }

          .checkbox {
            font-weight: bold;
            color: #0F766E;
            margin-right: 4px;
          }

          .divider {
            border: 0;
            border-top: 1px solid #E5E7EB;
            margin: 16px 0;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0;
            font-size: 12px;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
          }

          .data-table th, .data-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #E5E7EB;
          }

          .data-table th {
            background: #F3F4F6;
            color: #111827;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10.5px;
            letter-spacing: 0.5px;
          }

          .data-table tr:last-child td {
            border-bottom: none;
          }

          strong {
            color: #111827;
            font-weight: 700;
          }

          .code-badge {
            font-family: 'JetBrains Mono', monospace;
            background: #F3F4F6;
            color: #0F766E;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            border: 1px solid #E5E7EB;
          }

          .footer {
            margin-top: auto;
            padding-top: 12px;
            border-top: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 600;
            color: #6B7280;
            font-family: 'JetBrains Mono', monospace;
          }
        </style>
      </head>
      <body>
        ${rawPages
          .map(
            (pageMarkdown, index) => `
          <div class="page">
            <div>
              <div class="header">
                <div class="logo">⚡ UES Analytics Intelligence</div>
                <div class="date">DATE: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              ${formatMarkdownToHtml(pageMarkdown)}
            </div>
            <div class="footer">
              <span>CONFIDENTIAL & PROPRIETARY — UES ENGAGEMENT PLATFORM</span>
              <span>PAGE ${index + 1} OF ${rawPages.length}</span>
            </div>
          </div>
        `
          )
          .join("")}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
