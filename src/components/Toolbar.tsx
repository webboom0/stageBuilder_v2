import React from "react";
import {
  AppBar,
  Toolbar as MuiToolbar,
  Button,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ContentCut,
  PlayArrow,
  Pause,
  Save,
  Upload,
} from "@mui/icons-material";

interface ToolbarProps {
  onVideoUpload: (file: File) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onVideoUpload }) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onVideoUpload(file);
    }
  };

  return (
    <AppBar position="static" color="default">
      <MuiToolbar>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" component="label" startIcon={<Upload />}>
            영상 업로드
            <input
              type="file"
              hidden
              accept="video/*"
              onChange={handleFileUpload}
            />
          </Button>

          <Tooltip title="자르기">
            <IconButton>
              <ContentCut />
            </IconButton>
          </Tooltip>

          <Tooltip title="재생">
            <IconButton>
              <PlayArrow />
            </IconButton>
          </Tooltip>

          <Tooltip title="일시정지">
            <IconButton>
              <Pause />
            </IconButton>
          </Tooltip>

          <Tooltip title="저장">
            <IconButton>
              <Save />
            </IconButton>
          </Tooltip>
        </Stack>
      </MuiToolbar>
    </AppBar>
  );
};

export default Toolbar;
