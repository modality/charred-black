require 'json'

module Charred
  module Gold
    def load_gold(data)
      file = File.read('data/gold/skills.json')
      skills = JSON.parse(file)

      file = File.read('data/gold/traits.json')
      traits = JSON.parse(file)

      lifepaths = {}
      resources = {}
      stat_pts = {}

      stocks = ['dwarf', 'elf', 'man', 'orc', 'roden', 'wolf']

      stocks.each do |stock|
        file = File.read("data/gold/lifepaths/#{stock}.json")
        lifepaths[stock]  = JSON.parse(file)

        file = File.read("data/gold/resources/#{stock}.json")
        resources[stock]  = JSON.parse(file)

        file = File.read("data/gold/starting_stat_pts/#{stock}.json")
        stat_pts[stock]  = JSON.parse(file)
      end

      data.merge!({
        :stocks => stocks,
        :skills => skills,
        :traits => traits,
        :lifepaths => lifepaths,
        :resources => resources,
        :stat_pts => stat_pts
      })
    end
  end
end