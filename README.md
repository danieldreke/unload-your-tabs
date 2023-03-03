# Unload Your Tabs

Firefox browser extension to unload specific or all tabs with one click.

## Core Features

- `Unload all tabs`
  - Unloads all tabs by using blank pages
- `Keep only current window`
  - Unloads all tabs except of current window
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
- List of loaded tabs and their parent windows
  - Switch to hovered tab via `Right Mouse Button Click`
  - Switch to hovered window via `Right Mouse Button Click`
  - Unload hovered tab via `Left Mouse Button Click`
  - Unload tabs of hovered window via `Left Mouse Button Click`
  - Close hovered tab via `Middle Mouse Button Click`

## Usage of Blank Tabs

A browser window always has one active tab. To unload this active tab another tab has to be activated/switched to first. This extension switches to a blank tab if no other loaded tab exists and creates a blank tab automatically beforehand if needed.

## How this Extension Unloads a Tab

- Switches to another loaded tab if tab to unload is active
  - Switches to a blank tab if no loaded tab exists
    - Creates a blank tab if no blank tab exists before switching to it
- Unloads tab

## Undiscardable Tabs

Cases a tab cannot be unloaded/discarded:

- Tab is playing media
- Tab is in `editing` state
- Tab is an `about:` tab
  - Examples: [about:addons](about:addons), [about:debugging](about:debugging)
