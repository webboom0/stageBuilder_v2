const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3001;

// CORS 설정 - 더 유연하게 설정
app.use(cors({
  origin: function (origin, callback) {
    // 개발 환경에서는 모든 origin 허용
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      // 프로덕션 환경에서는 특정 도메인만 허용
      callback(null, true); // 임시로 모든 origin 허용
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공
app.use('/files', express.static(path.join(__dirname, '../files')));

// 헬스체크 API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    server: 'audio-upload-server',
    version: '1.0.0'
  });
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: '🎵 음악 업로드 서버가 실행 중입니다.',
    endpoints: {
      health: '/api/health',
      upload: '/api/upload-audio',
      files: '/api/audio-files'
    },
    timestamp: new Date().toISOString()
  });
});

// 음악 파일 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../files/music');
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 원본 파일명 유지하되 중복 방지
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    const timestamp = Date.now();
    const filename = `${originalName}_${timestamp}${extension}`;
    
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
  },
  fileFilter: function (req, file, cb) {
    // 오디오 파일 형식 검사
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
      'audio/mp4', 'audio/aac', 'audio/flac'
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 오디오 파일 형식입니다.'), false);
    }
  }
});

// 음악 파일 업로드 API
app.post('/api/upload-audio', upload.single('audioFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadTime: new Date().toISOString()
    };

    console.log('음악 파일 업로드 성공:', fileInfo);

    res.json({
      success: true,
      message: '파일 업로드가 완료되었습니다.',
      file: fileInfo
    });

  } catch (error) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ error: '파일 업로드 중 오류가 발생했습니다.' });
  }
});

// 음악 파일 목록 조회 API
app.get('/api/audio-files', (req, res) => {
  try {
    const musicPath = path.join(__dirname, '../files/music');
    
    if (!fs.existsSync(musicPath)) {
      return res.json([]);
    }

    const files = fs.readdirSync(musicPath);
    const audioFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext);
      })
      .map(file => {
        const name = path.parse(file).name;
        const ext = path.extname(file);
        const stats = fs.statSync(path.join(musicPath, file));
        
        return {
          name: name,
          displayName: name.replace(/[_-]/g, ' '), // 언더스코어와 하이픈을 공백으로 변환
          filename: file, // 실제 파일명 (확장자 포함)
          path: `/files/music/${file}`,
          size: stats.size,
          modifiedTime: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime)); // 최신 파일 순으로 정렬

    res.json(audioFiles);

  } catch (error) {
    console.error('음악 파일 목록 조회 오류:', error);
    res.status(500).json({ error: '파일 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 음악 파일 삭제 API
app.delete('/api/audio-files/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../files/music', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    fs.unlinkSync(filePath);
    console.log('음악 파일 삭제 완료:', filename);

    res.json({
      success: true,
      message: '파일이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('파일 삭제 오류:', error);
    res.status(500).json({ error: '파일 삭제 중 오류가 발생했습니다.' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🎵 음악 업로드 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📁 음악 파일 경로: ${path.join(__dirname, '../files/music')}`);
  console.log(`🌐 API 엔드포인트: http://localhost:${PORT}/api`);
});

// 에러 핸들링
app.use((error, req, res, next) => {
  console.error('서버 오류:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: '파일 크기가 제한을 초과했습니다.',
        details: `최대 파일 크기: ${(50 * 1024 * 1024 / (1024 * 1024)).toFixed(0)}MB`
      });
    }
  }
  
  res.status(500).json({ 
    error: '서버 내부 오류가 발생했습니다.',
    details: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// 404 핸들링
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '요청한 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = app;

