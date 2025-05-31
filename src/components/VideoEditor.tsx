import React, { useEffect, useRef } from "react";
import { Box, Paper } from "@mui/material";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

interface VideoEditorProps {
  videoFile: File | null;
  currentTime: number;
}

const ffmpeg = createFFmpeg({ log: true });

const VideoEditor: React.FC<VideoEditorProps> = ({
  videoFile,
  currentTime,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
    };
    loadFFmpeg();
  }, []);

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const url = URL.createObjectURL(videoFile);
      videoRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <Paper
      sx={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "grey.900",
      }}
    >
      <Box sx={{ maxWidth: "100%", maxHeight: "100%" }}>
        <video
          ref={videoRef}
          controls
          style={{ maxWidth: "100%", maxHeight: "70vh" }}
        />
      </Box>
    </Paper>
  );
};

export default VideoEditor;
