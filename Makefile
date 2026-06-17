include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for sing-box
LUCI_DEPENDS:=+sing-box +curl +rpcd +rpcd-mod-ucode
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-sb
PKG_VERSION:=0.1.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
