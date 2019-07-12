require 'json'

module Charred
  module DarkElf
    def load_dark_elf(data)
      file = File.read('data/dark_elf/skills.json')
      skills = JSON.parse(file)
      data[:skills].merge! skills

      file = File.read('data/dark_elf/traits.json')
      traits = JSON.parse(file)
      data[:traits].merge! traits
    end
  end
end