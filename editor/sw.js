const CACHE_NAME = "v1";

// Service Worker 설치
self.addEventListener("install", (event) => {
  // 설치 즉시 활성화
  self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener("activate", (event) => {
  // 활성화 즉시 클라이언트 제어 시작
  event.waitUntil(clients.claim());
});

// 요청 처리
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // chrome-extension 스키마 요청은 캐시하지 않음
  if (request.url.startsWith("chrome-extension://")) {
    event.respondWith(fetch(request));
    return;
  }

  // 비디오 파일이나 Range 요청인 경우 네트워크에서 직접 로드
  if (
    request.url.includes("/files/video.mp4") ||
    request.headers.has("range")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // 다른 리소스는 네트워크 우선 전략 사용
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 성공적인 응답만 캐시에 저장 (206 응답 제외)
        if (response.ok && response.status !== 206) {
          const responseToCache = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => {
              try {
                cache.put(request, responseToCache);
              } catch (error) {
                console.warn("캐시 저장 실패:", error);
              }
            })
            .catch((error) => {
              console.warn("캐시 열기 실패:", error);
            });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 요청 실패 시 캐시에서 응답 시도
        return caches.match(request);
      }),
  );
});
