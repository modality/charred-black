## Deploy Steps

See: [Heroku - Container Registry and Runtime](https://devcenter.heroku.com/articles/container-registry-and-runtime)

```
heroku login
heroku container:login
heroku container:push web -a charred-black
heroku container:release web -a charred-black
heroku open
```