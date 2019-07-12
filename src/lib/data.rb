require 'json'

module CharredData
  def self.load_wizard_burner(data)

    data
  end

  def self.load_data
    file = File.read('data/skills.json')
    skills = JSON.parse(file)

    file = File.read('data/traits.json')
    traits = JSON.parse(file)

    lifepaths = {}
    resources = {}
    stat_pts = {}

    stocks = ['dwarf', 'elf', 'man', 'orc', 'roden', 'wolf']

    stocks.each do |stock|
      file = File.read("data/lifepaths/#{stock}.json")
      lifepaths[stock]  = JSON.parse(file)

      file = File.read("data/resources/#{stock}.json")
      resources[stock]  = JSON.parse(file)

      file = File.read("data/starting_stat_pts/#{stock}.json")
      stat_pts[stock]  = JSON.parse(file)
    end

    data = {
      :stocks => stocks,
      :skills => skills,
      :traits => traits,
      :lifepaths => lifepaths,
      :resources => resources,
      :stat_pts => stat_pts
    }

    data = self.load_wizard_burner(data)

    data
  end
end