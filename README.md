# Xteink Calendar Studio

A static HTML, CSS, and JavaScript calendar editor. Open `index.html` in a browser, or publish the directory to any static host. No build step or package manager is required.

## Files

- `index.html`: accessible UI components and settings panels.
- `styles.css`: monochrome theme variables and responsive desktop/mobile layouts.
- `app.js`: canvas rendering, settings, image uploads, month navigation, and PNG export.
- `assets/`: locally bundled icons, the default landscape photograph, and the transparent vector Xteink preview frame.
- `references/`: original layout sketches.

Choose Portrait or Landscape in Layout. Portrait renders and exports at 480 x 800 pixels; Landscape uses 800 x 480 pixels. Portrait places the image above the calendar, while Landscape places it to the left. The image-size slider controls height in Portrait and width in Landscape. Switching orientation preserves other settings and updates slider availability; Reset returns to Portrait. The device frame rotates for Landscape while calendar text remains upright.

The preview's display size is responsive. Desktop places controls to the left of the preview. Mobile uses a viewport-height layout with an always-visible preview, independently scrolling controls, and a wide non-scrolling options bar containing the settings tabs and PNG export action. The header bar is hidden on mobile, with the theme toggle retained in the preview toolbar. Slider labels sit above the track, with values aligned right.

On mobile, reset, enlarge, and theme controls move into a vertical rail beside the preview when the existing gutter has enough room. This removes the top toolbar row without reducing the canvas size. Narrow layouts retain the compact top toolbar, and placement is recalculated on resize and when the preview is enlarged.

Light/dark mode follows the system preference on first visit and remembers an explicit selection. Canvas inversion is independent of the interface theme. Layout, Image, and Type tabs contain working controls, including native selects, sliders, switches, image upload, and text input. Horizontal margins control left/right spacing from 0 to 56 px. Vertical margins control top/bottom spacing from 0 to 240 px. Both default to 0 px.

Slider ranges remain fixed. Unavailable portions of the margins, image size, calendar spacing, month/year size, date size, and image corner radius tracks are greyed out based on the current layout. Mouse, touch, and keyboard changes stop at the available limit and change only the active slider, never other slider values. Limits account for orientation, image size, margins, month rows, typography, and footer. Changing months or toggles preserves existing values; values that no longer fit are marked unavailable rather than silently reduced. Hover tooltips and accessible value text report the current limits.

Change `defaults` in `app.js` to customize the initial calendar. Theme tokens are defined at the top of `styles.css`. Uploads stay in the browser; no data is sent to a server. Export produces a PNG named `xteink-YYYY-MM.png`.

Monthly images is off by default in the Image tab. When enabled, its month selector and previous/next buttons change the preview month without changing the year, wrapping between December and January. Uploads then apply only to the selected month, across all years. Months without an override use the single image chosen with Monthly images off. The remove button clears the selected month's override. Image size, rounded corners, and treatment settings stay shared. Turning monthly mode off preserves overrides; Reset clears them and restores the default photograph. Uploaded images and overrides last only for the current page session.

Defaults prioritize readability on the small Xteink display: zero page margin, 48 px dates, a 62 px editorial serif month title, 22 px weekday labels, 8 px calendar spacing, and a 28% edge-to-edge image. The footer note is off by default, and calendar rows expand into the available height. Settings remain shared across months.

Week numbers and the image are enabled by default, with switches in Layout. Week numbers use ISO 8601; each displayed row is numbered using its Thursday, including when Sunday is selected as the first day. Disabling the image expands the calendar without removing the selected image or its treatment settings.

Month and year are preview state, selected through the settings cog beside the enlarge button or the previous/next month controls. They are not design settings: resetting the design keeps the displayed month and year, and design settings remain shared across dates. The preview settings popover can be dismissed with its close button, Escape, or an outside click.

## Assets

- Default photograph: [Unsplash image source](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b), supplied through images.unsplash.com under the [Unsplash License](https://unsplash.com/license).
- Icons: [Lucide](https://lucide.dev), pinned at 0.468.0, [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
- Interface typography: DM Sans and DM Mono from Google Fonts. Fonts are optional external requests; local serif, sans-serif, and monospace fallbacks keep the editor usable offline.

The reference sketches are not used as runtime assets. `assets/xteink-frame.svg` is a clean vector trace of `references/xteink.png`, with a transparent background and screen opening adjusted to the wallpaper's 3:5 aspect ratio. The live canvas sits inside this opening; the device frame is preview-only and is not included in PNG exports.