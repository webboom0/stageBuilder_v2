import React from "react";
import { Box, Paper, Slider } from "@mui/material";

interface TimelineProps {
  duration: number;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  onTimeUpdate,
}) => {
  const handleChange = (_event: Event, newValue: number | number[]) => {
    onTimeUpdate(newValue as number);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Slider
            value={currentTime}
            max={duration}
            onChange={handleChange}
            aria-label="Time"
            valueLabelDisplay="auto"
            valueLabelFormat={(value) =>
              `${Math.floor(value / 60)}:${String(
                Math.floor(value % 60)
              ).padStart(2, "0")}`
            }
          />
        </Box>
        <Box sx={{ minWidth: 60 }}>
          {Math.floor(currentTime / 60)}:
          {String(Math.floor(currentTime % 60)).padStart(2, "0")} /
          {Math.floor(duration / 60)}:
          {String(Math.floor(duration % 60)).padStart(2, "0")}
        </Box>
      </Box>
    </Paper>
  );
};

export default Timeline;
