import React, { useState } from "react";
import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import VideoEditor from "./components/VideoEditor";
import Timeline from "./components/Timeline";
import Toolbar from "./components/Toolbar";

const theme = createTheme({
  palette: {
    mode: "dark",
  },
});

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handleVideoUpload = (file: File) => {
    setVideoFile(file);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false}>
        <Box
          sx={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            py: 2,
          }}
        >
          <Toolbar onVideoUpload={handleVideoUpload} />
          <VideoEditor videoFile={videoFile} currentTime={currentTime} />
          <Timeline
            duration={videoFile ? 100 : 0}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
          />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
