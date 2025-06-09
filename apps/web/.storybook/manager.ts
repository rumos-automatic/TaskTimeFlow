import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

const theme = create({
  base: 'light',
  brandTitle: 'TaskTimeFlow Components',
  brandUrl: 'https://tasktimeflow.com',
  brandImage: '/logo.svg',
  brandTarget: '_self',

  // UI colors
  colorPrimary: '#667eea',
  colorSecondary: '#764ba2',

  // Typography
  fontBase: '"Inter", sans-serif',
  fontCode: '"Fira Code", monospace',

  // Text colors
  textColor: '#333333',
  textInverseColor: '#ffffff',

  // Toolbar default and active colors
  barTextColor: '#666666',
  barSelectedColor: '#667eea',
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#e1e5e9',
  inputTextColor: '#333333',
  inputBorderRadius: 6,
});

addons.setConfig({
  theme,
  panelPosition: 'right',
  sidebar: {
    showRoots: true,
    collapsedRoots: ['components'],
  },
});