# Masar (مسار) — Saudi careers prototype

A front-end prototype of a job-seeking platform for Saudi companies, in English and Arabic (RTL), with dark and light modes.

## Flow
1. **Home**: search, suggested specializations, and companies hiring. Picking a specialization filters the companies.
2. **Company**: open roles, skills in demand, co-op program, then **Start your resume**.
3. **Format**: chronological, functional or hybrid, each with a short description.
4. **Builder**: a blank template to fill in, with a live preview. The **smart gauge** scores how well the listed skills and abilities match what the company wants and suggests missing ones. **Save as PDF** uses the browser's print dialog.
5. **Submit**: leads to a timed **skills assessment** on the listed skills, then a results page.

Also: Companies, Majors and Co-op pages, demo login, notifications, and a language and theme toggle.

## Run
No build step. Open `index.html`, or serve the folder:

```
python3 -m http.server 8000
```

## Files
- `index.html`: page shell
- `assets/css/styles.css`: design tokens (palette `#2d3250 #424769 #676f9d #f9b17a #ffffff`) and styles
- `assets/js/data.js`: companies, majors, skills, notifications and quiz questions (sample data)
- `assets/js/i18n.js`: English and Arabic interface text
- `assets/js/icons.js`: inline SVG icons
- `assets/js/app.js`: routing, views, resume builder, smart gauge and assessment

Drafts, login and results are stored in the browser (localStorage). Company names are real employers shown for illustration only. Roles, skills and co-op details are sample data.
