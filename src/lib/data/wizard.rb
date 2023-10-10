require 'json'

module Charred
  module Wizard
    def load_wizard(data)
      file = File.read('data/wizard/lifepaths.json')
      wizard_data = JSON.parse(file)

      file = File.read('data/wizard/skills.json')
      wizard_skills = JSON.parse(file)
      verbose_merge data[:skills], wizard_skills

      file = File.read('data/wizard/traits.json')
      wizard_traits = JSON.parse(file)
      verbose_merge data[:traits], wizard_traits

      man = data[:lifepaths]['man']

      man['College of Magic Subsetting'] = wizard_data['College of Magic Subsetting']
      man['Death Cult Subsetting'] = wizard_data['Death Cult Subsetting']

      data[:lifepaths]['orc']['Servant Of The Dark Blood Subsetting'].merge!(wizard_data['Servant Of The Dark Blood Subsetting'])

      [
        'Peasant Setting',
        'Villager Setting',
        'City Dweller Setting',
        'Noble Court Subsetting',
        'Outcast Subsetting'
      ].each do |setting|
        man[setting].merge!(wizard_data[setting])
      end

      [
        'Peasant Setting',
        'Villager Setting',
        'City Dweller Setting',
        'Seafaring Setting',
        'Servitude And Captive Setting'
      ].each do |setting|
        man[setting].merge!({
          'Gifted Child' =>  wizard_data['Special Gifted Lifepaths']['Gifted Child']
        })
      end

      [
        'Noble Court Subsetting',
        'Religious Subsetting',
        'Outcast Subsetting',
        'Professional Soldier Subsetting'
      ].each do |setting|
        man[setting].merge!({
          'Apt Pupil' =>  wizard_data['Special Gifted Lifepaths']['Apt Pupil']
        })
      end

      leads_short = {
        'College of Magic Subsetting' => 'College',
        'Death Cult Subsetting' => 'Death',
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

      # backfill Neophyte Sorcerer and Arcane Devotee connections
      man.keys.each do |man_set|
        man[man_set].keys.each do |man_lp|
          requirements = self.lifepath_requirements(man[man_set][man_lp]["requires_expr"])
          requirements.collect! { |req| req.include?(':') ? req.split(":")[1].downcase : req.downcase }

          if requirements.include? "neophyte sorcerer"
            if man[man_set][man_lp]["requires_expr"].include? "neophyte sorcerer"
              man[man_set][man_lp]["requires_expr"] |= ["apt pupil", "wizard's apprentice", "junior student"]
            else
              puts "warning, could not add neophyte sorcerer connection to deep requirements array at #{man_set}:#{man_lp}"
            end
          end

          if requirements.include? "arcane devotee"
            if man[man_set][man_lp]["requires_expr"].include? "arcane devotee"
              man[man_set][man_lp]["requires_expr"] |= ["junior student"]
            else
              puts "warning, could not add arcane devotee connection to deep requirements array at #{man_set}:#{man_lp}"
            end
          end
        end
      end

      data[:lifepaths]['man'] = man
      data
    end
  end
end
