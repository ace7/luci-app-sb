# luci-app-sb

LuCI frontend for managing `sing-box` on OpenWrt.

## Features

- Show `sing-box` service status, autostart state, version, PID, and config path.
- Start, stop, restart, and refresh service state.
- Load `/etc/sing-box/config.json` from the configured UCI `sing-box.main.conffile`.
- Edit the config in a text area.
- Validate config with `sing-box check`.
- Save config with a timestamped `.bak-luci-sb-*` backup.
- Save and restart in one step.
- Speed test:
  - Baidu direct
  - Google via local mixed proxy `127.0.0.1:7890`
  - GitHub via local mixed proxy `127.0.0.1:7890`

The app uses a dedicated rpcd ucode backend (`ubus object: sb`) instead of granting LuCI broad arbitrary command execution.

## Files

```text
Makefile
htdocs/luci-static/resources/view/sb.js
root/etc/uci-defaults/99_luci-app-sb
root/usr/share/luci/menu.d/luci-app-sb.json
root/usr/share/rpcd/acl.d/luci-app-sb.json
root/usr/share/rpcd/ucode/sb
```
