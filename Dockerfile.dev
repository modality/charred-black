FROM ruby:2.6.3

EXPOSE 7878

ENV HOST=0.0.0.0 PORT=7878 RACK_ENV=development

# throw errors if Gemfile has been modified since Gemfile.lock
RUN bundle config --global frozen 1

WORKDIR /app

# to generate Gemfile.lock, run this in service dir:
# $ docker run --rm -v "$PWD":/app -w /app ruby:2.6.3 bundle install
COPY Gemfile Gemfile.lock /app/
RUN bundle install

COPY . /app

WORKDIR /app/src

CMD ["rerun", "-b", "--", "ruby", "./app.rb"]
#CMD ["ruby", "./app.rb"]