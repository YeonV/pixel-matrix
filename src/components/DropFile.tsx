import { Box, useTheme } from '@mui/material'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

function DropFile({ onload }: any) {
  const theme = useTheme()
  const onDrop = useCallback((acceptedFiles: any) => {
    acceptedFiles.forEach((file: any) => {
      const reader = new FileReader()

      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.onload = () => {
        const img = document.createElement('img')
        img.onload = function () {
          onload(img)
        }
        img.src = reader.result as string
      }
      reader.readAsArrayBuffer(file)
    })
  }, [])

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '3px dashed',
        borderRadius: 2,
        borderColor: theme.palette.primary.main,
        cursor: 'pointer',
      }}
    >
      <input {...getInputProps()} />
      <p>Drop File or click</p>
    </Box>
  )
}

export default DropFile
