---
title: "Implementation Plan - Course Design Report Skill Template & Automation"
---



The goal is to recreate a formatting template file (`template.docx`) based on the formatting specifications of `课程设计格式2026---指导教师2026.6.12.doc` (which we have converted to `template_source.docx`), replacing the text-based sample code inside it with a Carbon-style screenshot of the `carbon` project itself (`E:\AI\antigravity\stady-code\supplement\carbon`). We will also align the Python environments and verify the whole skill end-to-end.

## User Review Required

> [!IMPORTANT]
> - **Code screenshot selection**: We plan to take a screenshot of `next.config.js` (lines 1 to 28) from the `carbon` project. Let us know if you prefer a different source file.
> - **Carbon screenshot configuration**:
>   - Theme: `one-light` (white)
>   - Window Theme: `mac` (3-color dots)
>   - Shadow/Border: Disabled (`ds=false`, transparent background `rgba(255,255,255,0)`)
>   - Watermark: `user` (added in the bottom right corner via post-processing PIL library since Carbon's own watermark URL query is a binary logo switch)
> - **Template recreation strategy**: We will write a script to load the original template paragraphs from the converted docx, find the contiguous paragraph blocks representing Java code, delete those code paragraphs, insert the generated Carbon screenshot at their locations, and save it as `assets/template.docx` inside the skill directory.

## Open Questions

> [!NOTE]
> 1. Should we replace **all** sample Java code blocks (e.g., `DbUtils`, `DaoUtils`, entity classes, main entry) in the formatting template with the carbon screenshot of `next.config.js`, or did you want specific parts of the carbon project screenshotted for different sections? (We recommend replacing all of them with the `next.config.js` screenshot as placeholders to show the formatting).
> 2. Will the template be saved as `assets/template.docx` so the document builder script `build_docx.py` can automatically use it as its styling base? (We recommend this).

---

## Proposed Changes

### Recreate Template and Screenshots

#### [NEW] [rebuild_template.py](file:///E:/AI/zcode/object/skills/course-design-report/scripts/rebuild_template.py)
A script to automate the recreation of `assets/template.docx` from `references/template_source.docx` by:
1. Taking a screenshot of `next.config.js` from the `carbon` project using `node scripts/screenshot.js`.
2. Locating all text-based code blocks in `template_source.docx`.
3. Replacing them with the generated PNG image and appropriate captions.
4. Outputting the result as `E:\AI\zcode\object\skills\course-design-report\assets\template.docx`.

#### [NEW] [template.docx](file:///E:/AI/zcode/object/skills/course-design-report/assets/template.docx)
The final styling and layout template file, containing the correct styles (margins, font sizes, paragraph formats, headers, footers) and having the sample code replaced with Carbon screenshots.

---

### Python Environment Alignment

We will configure the python commands to use the path `C:\Users\user\AppData\Local\Programs\Python\Python313\python.exe` (which contains `python-docx` and `pillow`) or install `python-docx` in the active environment if desired.

---

### Document Assembly and Screenshot Scripts Verification

#### [MODIFY] [build_docx.py](file:///E:/AI/zcode/object/skills/course-design-report/scripts/build_docx.py)
Review and fix any potential bugs in:
- The three-line borders implementation (`_apply_three_line_borders`).
- TOC domain fields (`add_toc_field`).
- Header/footer placement.

#### [MODIFY] [screenshot.js](file:///E:/AI/zcode/object/skills/course-design-report/scripts/screenshot.js)
Ensure:
- The Puppeteer screenshot logic operates correctly when `localhost:3000` is active.
- The Python post-processing watermark addition handles path escaping correctly in Windows environments.

---

## Verification Plan

### Automated Tests
1. **Carbon Dependency Verification**: Wait for `npx yarn install` inside the carbon project to finish.
2. **Start Carbon Server**: Start the local server with `npx yarn dev` and verify it serves `http://localhost:3000`.
3. **Screenshot Script Test**: Run:
   ```bash
   node scripts/screenshot.js --code E:\AI\antigravity\stady-code\supplement\carbon\next.config.js --lang javascript --out test_carbon.png
   ```
   Verify `test_carbon.png` is generated with the `user` watermark and transparent background.
4. **Template Rebuilding**: Run the `rebuild_template.py` script to generate `assets/template.docx`.
5. **Document Assembly Test**: Run:
   ```bash
   "C:\Users\user\AppData\Local\Programs\Python\Python313\python.exe" scripts/build_docx.py --content test/content.json --out test/test_report.docx
   ```
   Verify that `test_report.docx` compiles successfully.

### Manual Verification
- Open `assets/template.docx` and `test_report.docx` to manually verify formatting layout (margins, fonts, three-line tables, code image positioning, header/footer text).
