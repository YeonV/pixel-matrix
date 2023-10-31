import { createTheme } from '@mui/material'

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'contained',
        fullWidth: true,
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
      },
    },
  },
})
