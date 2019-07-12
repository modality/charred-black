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

      file = File.read('data/dark_elf/lifepaths.json')
      lifepaths = JSON.parse(file)

      file = File.read("data/dark_elf/resources.json")
      resources = JSON.parse(file)
      data[:resources]['elf'] += resources

      elf = data[:lifepaths]['elf']

      elf.keys.each do |elf_set|
        elf[elf_set].keys.each do |elf_lp|
          elf[elf_set][elf_lp]['key_leads'] |= ['Path Of Spite Subsetting']
          elf[elf_set][elf_lp]['leads'] |= ['Spite']
        end
      end

      elf['Path Of Spite Subsetting'] = lifepaths['Path Of Spite Subsetting']

      data[:lifepaths]['elf'] = elf
    end
  end
end