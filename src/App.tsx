import './App.css'
import { AppBar } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { darkTheme } from './theme'
import Content from './Content'

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position='fixed' sx={{ height: 40, justifyContent: 'center' }}>
        Pixel-Matrix
      </AppBar>
      <main>
        <Content />
      </main>
      <footer>Hacked by Blade | for SpiroC</footer>
    </ThemeProvider>
  )
}

export default App
