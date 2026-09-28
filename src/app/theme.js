export const themeConfig = {
    token: {
        colorPrimary: '#D6336C',
        colorInfo: '#0E4D5C',
        colorLink: '#D6336C',
        colorTextBase: '#0E4D5C',
        colorTextSecondary: 'rgba(14, 77, 92, 0.68)',
        colorBgLayout: '#F6D155',
        colorBgContainer: '#FFFFFF',
        colorBorder: '#A61E4D',
        colorBorderSecondary: '#D6B35A',
        colorWarning: '#F28C28',
        colorError: '#A61E4D',
        borderRadius: 12,
        borderRadiusLG: 18,
        fontFamily:
            "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        fontSize: 14,
        controlHeight: 38,
    },
    components: {
        Button: {
            borderRadius: 10,
            borderRadiusLG: 12,
            fontWeight: 600,
            defaultBorderColor: '#A61E4D',
            defaultColor: '#A61E4D',
            defaultBg: '#FFFFFF',
            primaryShadow: '0 3px 0 #A61E4D',
            defaultShadow: '0 3px 0 #A61E4D',
        },
        Menu: {
            itemBorderRadius: 10,
            itemHeight: 42,
            itemMarginInline: 8,
            fontSize: 15,
            itemColor: '#0E4D5C',
            itemHoverBg: '#FAD0DC',
            itemHoverColor: '#A61E4D',
            itemSelectedBg: '#0E4D5C',
            itemSelectedColor: '#FCD34D',
        },
        Modal: {
            borderRadiusLG: 20,
        },
        Input: {
            borderRadius: 10,
            activeShadow: '0 0 0 3px rgba(214, 51, 108, 0.16)',
        },
        Collapse: {
            headerBg: '#FFF6E0',
            contentBg: '#FFFFFF',
        },
        Switch: {
            colorPrimary: '#D6336C',
        },
    },
};
