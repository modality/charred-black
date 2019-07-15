require_relative 'data/gold'
require_relative 'data/wizard'
require_relative 'data/dark_elf'
require_relative 'data/troll'

module Charred
  class Data
    include Charred::Gold
    include Charred::Wizard
    include Charred::DarkElf
    include Charred::Troll

    attr :data

    def initialize
      @data = {}

      puts 'loading gold'
      load_gold(@data)

      puts 'loading wizard burner'
      load_wizard(@data)

      puts 'loading dark elves'
      load_dark_elf(@data)

      puts 'loading trolls'
      load_troll(@data)
    end

    def verbose_merge(to, from)
      from.keys.each do |k|
        puts "warning: destination contains #{k}" if to.include? k
        to[k] = from[k]
      end
    end

    def lifepath_requirements(expr)
      if expr.is_a? Numeric
        []
      elsif expr.is_a? String
        if expr.start_with? "+"
          []
        else
          expr
        end
      elsif expr.is_a? Array
        (expr.map { |e| self.lifepath_requirements(e) }).flatten
      else
        []
      end
    end
  end
end