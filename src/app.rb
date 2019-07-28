require 'sinatra'
require 'sinatra/json'
require 'json'

require_relative 'lib/cache'
require_relative 'lib/pdf'
require_relative 'lib/data'

use Rack::Logger
set :bind, ENV['HOST']
set :port, ENV['PORT']

CACHE = Mu::Cache.new :max_size => 128, :max_time => 30.0
DATA = Charred::Data.new.data

helpers do
  def logger
    request.logger
  end
end

get '/' do
  erb :index
end

get '/list_chars/:user' do
  "{}"
end

get /\/([\w]+)_partial/ do
  partial = params['captures'].first
  erb "partials/#{partial}".to_sym
end

get '/namegen/:gender' do
  if params['gender'] == 'female'
    ['Ada', 'Belle', 'Carmen', 'Desdemona', 'Edie'].sample
  elsif params['gender'] == 'male'
    ['Agamemnon', 'Beren', 'Cadwalader', 'Dro', 'Edgar'].sample
  end
end

get '/skills' do
  json DATA[:skills]
end

get '/traits' do
  json DATA[:traits]
end

get '/lifepaths/:stock' do
  if DATA[:stocks].include? params['stock']
    json DATA[:lifepaths][params['stock']]
  else
    404
  end
end

get '/starting_stat_pts/:stock' do
  if DATA[:stocks].include? params['stock']
    json DATA[:stat_pts][params['stock']]
  else
    404
  end
end

get '/resources/:stock' do
  if DATA[:stocks].include? params['stock']
    json DATA[:resources][params['stock']]
  else
    404
  end
end

post '/charsheet' do
  request.body.rewind
  raw = request.body.readpartial(16 * 1024)
  data = JSON.parse(raw)
  key = "char-#{Time.now.strftime('%Y%m%d%H%M%S%L')}-#{rand(1...10000)}"
  CACHE.store key, data

  "/get_file?file=#{key}&download_name=#{data['name']} Character Sheet.pdf"
end

post '/upload_charfile' do
  data = params['charfile']['tempfile'].read
  erb '<html><body><pre><%= char %></pre></body></html>', :locals => {:char => data}
end

post '/download_charfile' do
  request.body.rewind  # in case someone already read it
  raw = request.body.readpartial(16 * 1024)
  data = JSON.parse(raw)
  key = "char-#{Time.now.strftime('%Y%m%d%H%M%S%L')}-#{rand(1...10000)}"
  CACHE.store key, data

  "/get_file?file=#{key}&download_name=#{data['name']} Character Sheet.char"
end

get '/get_file' do
  data = nil
  if params['download_name'].match(/\.pdf$/)
    content_type 'application/pdf'
    data = CACHE.delete(params['file'])
    if data
      cs = CharSheet.new(data)
      data = cs.render(logger, DATA)
    end
  else
    content_type 'application/octet-stream'
    data = JSON.dump CACHE.delete(params['file'])
  end
  attachment params['download_name']
  data
end