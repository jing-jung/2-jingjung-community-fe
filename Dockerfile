FROM nginx:alpine

# 1. 기존 파일 삭제
RUN rm -rf /usr/share/nginx/html/*

# 2. 우리 프로젝트 파일 복사
COPY . /usr/share/nginx/html
RUN ls -R /usr/share/nginx/html
# 3. 컨테이너 내부에서 login.html을 index.html로 복사 (이게 핵심!)
COPY login.html /usr/share/nginx/html/index.html
EXPOSE 80