require_relative 'data/gold'
require_relative 'data/wizard'

module Charred
  class Data
    include Charred::Gold
    include Charred::Wizard

    attr :data

    def initialize
      @data = {}

      load_gold(@data)
      load_wizard(@data)
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