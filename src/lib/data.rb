require_relative 'data/gold'
require_relative 'data/wizard'
require_relative 'data/dark_elf'

module Charred
  class Data
    include Charred::Gold
    include Charred::Wizard
    include Charred::DarkElf

    attr :data

    def initialize
      @data = {}

      load_gold(@data)
      load_wizard(@data)
      load_dark_elf(@data)
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