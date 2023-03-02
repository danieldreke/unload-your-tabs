# Unload Your Tabs

Firefox browser extension to unload specific or all tabs with one click.

## Core Features

- Unload all tabs
  - Unloads all tabs by using blank pages
- Keep only current window
  - Unloads all tabs except of current window
- Keep only current tab
  - Unloads all tabs except active tab of current window
- Unload current window
  - Unloads all tabs of current window
- Unload current tab
  - Unloads active tab of current window

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