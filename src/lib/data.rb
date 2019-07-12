require 'json'

module CharredData
  def self.merge_data!(to, from)
    from.keys.each do |k|
      to[k] = from[k]
    end
  end

  def self.lifepath_requirements(expr)
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

  def self.load_wizard_burner(data)
    puts 'Loading wizard burner'
    file = File.read('data/lifepaths/wizard.json')
    wizard_data = JSON.parse(file)

    file = File.read('data/wizard_skills.json')
    wizard_skills = JSON.parse(file)
    self.merge_data!(data[:skills], wizard_skills)

    file = File.read('data/wizard_traits.json')
    wizard_traits = JSON.parse(file)
    self.merge_data!(data[:traits], wizard_traits)

    man = data[:lifepaths]['man']

    man['College of Magic Setting'] = wizard_data['College of Magic Setting']
    man['Death Cult Setting'] = wizard_data['Death Cult Setting']

    self.merge_data!(data[:lifepaths]['orc']['Servant Of The Dark Blood Subsetting'], wizard_data['Servant Of The Dark Blood Subsetting'])

    [
      'Peasant Setting',
      'Villager Setting',
      'City Dweller Setting',
      'Noble Court Subsetting',
      'Outcast Subsetting'
    ].each do |setting|
      self.merge_data!(man[setting], wizard_data[setting])
    end

    [
      'Peasant Setting',
      'Villager Setting',
      'City Dweller Setting',
      'Seafaring Setting',
      'Servitude And Captive Setting'
    ].each do |setting|
      self.merge_data!(man[setting], {
        'Gifted Child' =>  wizard_data['Special Gifted Lifepaths']['Gifted Child']
      })
    end

    [
      'Noble Court Subsetting',
      'Religious Subsetting',
      'Outcast Subsetting',
      'Professional Soldier Subsetting'
    ].each do |setting|
      self.merge_data!(man[setting], {
        'Apt Pupil' =>  wizard_data['Special Gifted Lifepaths']['Apt Pupil']
      })
    end

    leads_short = {
      'College of Magic Setting' => 'College',
      'Death Cult Setting' => 'Death',
    }
    
    # backfill leads
    leads_short.keys.each do |wiz_set|
      wizard_data[wiz_set].keys.each do |wiz_lp|
        lifepath = wizard_data[wiz_set][wiz_lp]
        next if !lifepath['requires_expr']

        requirements = self.lifepath_requirements(lifepath['requires_expr'])

        requirements.each do |req|
          setting = nil
          req_lp = req
          setting, req_lp = req.split(':') if req.include? ':'

          man.keys.each do |man_set|
            next if wiz_set.downcase == man_set.downcase
            next if setting && setting != man_set.downcase
            man[man_set].keys.each do |man_lp|
              next if req_lp != man_lp.downcase

              #puts "adding #{wiz_set}:#{wiz_lp} lead to #{man_set}:#{man_lp}"

              man[man_set][man_lp]['key_leads'] |= [wiz_set]
              man[man_set][man_lp]['leads'] |= [leads_short[wiz_set]]
            end
          end
        end
      end
    end

    # backfill Apt Pupil == Neophyte Sorcerer connection
    man.keys.each do |man_set|
      man[man_set].keys.each do |man_lp|
        requirements = self.lifepath_requirements(man[man_set][man_lp]['requires_expr'])
        next if requirements.include? 'apt pupil'
        requirements.each do |req|
          setting = nil
          req_lp = req
          setting, req_lp = req.split(':') if req.include? ':'

          next unless req_lp.downcase == 'neophyte sorcerer'

          if man[man_set][man_lp]['requires_expr'].include? 'neophyte sorcerer'
            man[man_set][man_lp]['requires_expr'] |= ['apt pupil']
          else
            puts "warning, could not add apt pupil to deep requirements array at #{man_set}:#{man_lp}"
          end
        end
      end
    end

    data[:lifepaths]['man'] = man
    puts 'loaded!'
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