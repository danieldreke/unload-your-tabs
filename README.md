# Unload Your Tabs

Browser extension for Brave, Chrome and Firefox to unload all tabs or specific ones with one click.

## Core Features

- `Unload all tabs`
  - Unloads all tabs by using blank pages
- `Keep only current window`
  - Unloads all tabs except tabs of current window
- `Keep only current tab`
  - Unloads all tabs except active tab of current window
- `Unload current window`
  - Unloads all tabs of current window
- `Unload current tab`
  - Unloads active tab of current window

## Additional Features

- Multicolor Badge Counter of *loaded* tabs
  - Loaded tabs = undiscarded non blank tabs
  - `Green`: Less than 10 loaded tabs
  - `Orange`: More than 10 and less than 20 loaded tabs
  - `Red`: More than 20 loaded tabs
- Tab list of open windows and their tabs
  - Shows only loaded/discardable tabs by default; enable **Show all tabs** to also include unloaded and discarded tabs
  - Unloaded tabs appear dimmed
  - Each tab row shows the site favicon and title
  - The currently active tab is marked with a dot and shown in italic
  - Hovering a tab shows a tooltip with its full title and URL
  - **Tab row:**
    - Left click a loaded tab → unload it
    - Left click an unloaded tab → switch to it
    - Right click → switch to the tab
    - Middle click → unload and close the tab
  - **Window row:**
    - Left click → unload all tabs in that window
    - Right click → focus that window
- **Unload Tab** right-click context menu item available on any open tab or page

## How this extension achieves freeing a lot of memory if tab-heavy

New/blank tabs require minimum memory usage. This extension not only unloads/discards all loaded tabs, but also creates a new/blank tab in every window, if it doesn't exist already, switches to it, and then unloads all tabs the user wants. So if you have many windows with many tabs, unloading all tabs will significantly reduce memory usage and improve your computer's/laptops performance.

<!-- ## Usage of Blank Tabs

A browser window always has one active tab. To unload this active tab another tab has to be activated/switched to first. This extension switches to a blank tab if no other loaded tab exists and creates a blank tab automatically beforehand if needed. -->

<!-- ## How this Extension Unloads a Tab

- Switches to another loaded tab if tab to unload is active
  - Switches to a blank tab if no loaded tab exists
    - Creates a blank tab if no blank tab exists before switching to it
- Unloads tab -->

## Undiscardable Tabs

Some tabs cannot be unloaded/discarded:

- Tab is playing media
- Tab is in `editing` state
- Tab is a browser specific tab
  - Examples: [about:addons](about:addons), [about:debugging](about:debugging)

## Installation

**Firefox:** Open [about:debugging](about:debugging) → This Firefox → Load Temporary Add-on, then select any file in the extension folder.

**Chrome / Brave:** Open `chrome://extensions`, enable Developer mode, click Load unpacked, and select the extension folder.

## License

[LICENSE](LICENSE)
