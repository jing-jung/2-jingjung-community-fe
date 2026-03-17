FROM nginx:alpine

# 1. 기존 파일 삭제
RUN rm -rf /usr/share/nginx/html/*

# 2. 핵심 수정: 리포지토리 루트가 아니라, 프론트엔드 소스코드가 있는 폴더 안의 내용물을 복사합니다!
COPY ./2-jingjung-community-fe/ /usr/share/nginx/html/

# 3. 컨테이너 내부에서 login.html을 index.html로 복사
RUN cp /usr/share/nginx/html/login.html /usr/share/nginx/html/index.html

EXPOSE 80