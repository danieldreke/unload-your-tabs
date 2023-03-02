# Unload Your Tabs

Firefox browser extension to unload specific or all tabs with one click.

## Core Features

- Unload all tabs - Unloads all tabs by using blank pages
- Keep only active window - Unloads all tabs except of active window
- Keep only active tab - Unloads all tabs except active tab of active window
- Unload active window - Unloads all tabs of active window
- Unload active tab - Unloads active tab of active window

## Additional Features

- Badge Counter of *loaded* tabs
  - *Loaded* tab: undiscarded non blank tab
- List of loaded tabs and their parent windows
  - Unload tab on left click
  - Close tab on middle click
  - Switch to tab on right click
  - Unload tabs of window on left click
  - Switch to window on right click

## Unloading Tabs using Blank Tabs

Unloading algorithm:
- Switch to another *loaded* tab if tab is active
  - Switch to blank tab if no *loaded* tab exists
    - Create blank tab if not exists
- Unload tab

## Undiscardable Tabs

Cases a tab will/can not be unloaded/discarded:
- Tab is playing media
- Tab is in `editing` state
- Tab is a non blank loaded `about:` tab
  - For example `about:addons` or `about:debugging`