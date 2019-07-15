require 'json'

module Charred
  module Troll
    def load_troll(data)
      data[:stocks] << 'troll'

      file = File.read('data/troll/skills.json')
      skills = JSON.parse(file)
      verbose_merge data[:skills], skills

      file = File.read('data/troll/traits.json')
      traits = JSON.parse(file)
      verbose_merge data[:traits], traits

      file = File.read('data/troll/lifepaths.json')
      lifepaths = JSON.parse(file)
      data[:lifepaths]['troll'] = lifepaths

      file = File.read("data/troll/resources.json")
      resources = JSON.parse(file)
      data[:resources]['troll'] = resources

      file = File.read("data/troll/starting_stat_pts.json")
      stats = JSON.parse(file)
      data[:stat_pts]['troll'] = stats
    end
  end
end