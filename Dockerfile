FROM python:3.10
ENV PORT 8080
ENV HOST 0.0.0.0
WORKDIR /
COPY requirements.txt /requirements.txt
RUN pip3 install -r requirements.txt
COPY . /
ENTRYPOINT [ "python3" ]
CMD [ "app/app.py" ]
