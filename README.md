# Horizon Sales & Solutions — Website

A multi-page marketing website for Horizon Sales & Solutions, a direct sales and client acquisition firm based in Atlanta, GA.

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Hero, values, services overview, team preview, culture callout |
| About | `about.html` | Company story, core values manifesto, full team bios, timeline |
| Services | `services.html` | Detailed service breakdowns for Branding, Direct Marketing, Sales, Consulting |
| Join Us | `careers.html` | Career culture, 3-step process, values, apply CTA |
| Contact | `contact.html` | Contact form, phone, email, social links |

## File Structure

```
/
├── index.html
├── about.html
├── services.html
├── careers.html
├── contact.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
└── README.md
```

## Asset Swap Instructions

### Logo
The current logo is a text-based wordmark ("Horizon") with a CSS-generated circular mark. To replace with a real logo:

1. Add your logo image to an `/assets/` folder (e.g., `/assets/logo.svg`)
2. In each HTML file, find the `.nav-logo` element in both the `<nav>` and `<footer>`
3. Replace the `<div class="logo-mark"></div>` with `<img src="assets/logo.svg" alt="Horizon Sales & Solutions" class="logo-img">`
4. Add `.logo-img { height: 36px; width: auto; }` to `styles.css`

### Team Photos
Team member photos currently use placeholder silhouettes.

**Home page team cards:**
1. Find the `.team-photo` div for each team member
2. Replace the inner `.silhouette` div with: `<img src="assets/team/samantha.jpg" alt="Samantha Gonzalez" style="width:100%; height:100%; object-fit:cover;">`

**About page team section:**
1. Find the `.team-full-photo` divs
2. Add: `<img src="assets/team/samantha.jpg" alt="Samantha Gonzalez" style="width:100%; height:100%; object-fit:cover;">`

### Service Visuals
Each service on the Services page has a decorative visual placeholder. To add real imagery:
1. Find `.service-detail-visual` elements
2. Add an `<img>` inside or set the background image via inline style or CSS

### Hero Background
The hero uses CSS gradients and grain textures. To add a photo background:
1. In `styles.css`, find `.hero-bg`
2. Add `background-image: url('assets/hero.jpg');` and `background-size: cover; background-position: center;`
3. Adjust the gradient overlay opacity as needed

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Burnt Orange | `#C05E2A` | Primary accent, CTAs, highlights |
| Sage Green | `#8A9E7E` | Secondary accent |
| Light Purple | `#B5A8C8` | Tertiary accent |
| Warm Brown | `#7B5E43` | Body text |
| Cream | `#F8F3EC` | Background |
| Dark | `#2C2016` | Nav, headings, dark sections |

## Fonts (Google Fonts)

- **Display:** Cormorant Garamond (serif) — headlines, quotes
- **Body:** DM Sans — body text, navigation, buttons

## Features

- Fully responsive (mobile-first, tested at 375px / 768px / 1280px)
- Scroll-triggered reveal animations (IntersectionObserver)
- Animated stat counters
- Sticky navigation with blur backdrop on scroll
- Mobile hamburger menu with staggered link animations
- Hover lift effects on cards and buttons
- SVG horizon wave animation
- CSS grain texture overlays
- Contact form with client-side feedback
- No external dependencies (pure HTML/CSS/JS + Google Fonts)

## Deployment

This is a static site — deploy to any static hosting:
- **Netlify/Vercel:** Drag and drop the folder
- **GitHub Pages:** Push to a repo and enable Pages
- **Custom server:** Upload all files to your web root

## Contact Form

The contact form currently shows a client-side success message. To make it functional:
- Connect to a form backend service (Formspree, Netlify Forms, etc.)
- Or add a server-side endpoint and update the form's `action` attribute
