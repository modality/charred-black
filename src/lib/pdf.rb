require 'prawn'
require 'prawn/templates'

class CharSheet
  def initialize(character)
    @character = character
    @t1 = 16
    @t2 = 12
    @t3 = 10
  end

  def render_skill(pdf, skilldef, at)
    skill, shade, exponent = skilldef
    x, y = at

    pdf.text_box skill, :at => [x, y + 10], :width => 95, :height => 15, :overflow => :shrink_to_fit, :valign => :bottom, :size => @t1

    self.render_shade_exponent(pdf, shade, exponent, [x+101.5, y-0.8], 13.5, -0.2)
  end

  def render_shade_exponent(pdf, shade, exponent, at, xs = 13, ys = 0.5) 
    x, y = at
    pdf.draw_text shade, :at => [x, y], :size => @t2
    pdf.draw_text (exponent.to_s), :at => [x+xs, y+ys], :size => @t2
  end

  def render(logger)
    pdf = Prawn::Document.new(:template => 'data/gold.pdf')
    pdf.font 'data/caliban.ttf'
    pdf.default_leading -4

    # logger.info @character
   
    <<-GRID
    (0...40).each do |x|
      (0...30).each do |y|
        if x % 5 == 0 && y % 5 == 0
          pdf.stroke_color "ff0000"
        else
          pdf.stroke_color "cccccc"
        end
        pdf.stroke_circle [x * 20, y * 20], 1
      end
    end

    pdf.go_to_page(2)

    (0...40).each do |x|
      (0...30).each do |y|
        if x % 5 == 0 && y % 5 == 0
          pdf.stroke_color "ff0000"
        else
          pdf.stroke_color "cccccc"
        end
        pdf.stroke_circle [x * 20, y * 20], 1
      end
    end
    GRID

    pdf.draw_text @character['name'], :at => [5, 490], :size => @t1
    pdf.draw_text @character['stock'].capitalize, :at => [84, 490], :size => @t1
    pdf.draw_text @character['age'], :at => [165, 490], :size => @t1
    pdf.text_box @character['lifepaths'].join(', '), :at => [245, 499], :width => 100, :size => @t2

    character_traits = @character['traits'].select {|t| t[1] == 'character'}.map {|t| t[0] }
    die_traits = @character['traits'].select {|t| t[1] == 'die'}.map {|t| t[0] }
    call_on_traits = @character['traits'].select {|t| t[1] == 'call_on'}.map {|t| t[0] }

    pdf.text_box character_traits.join(", "), :at => [5, 214], :width => 110, :height => 50, :overflow => :shring_to_fit, :size => @t2
    pdf.text_box die_traits.join(", "), :at => [122, 214], :width => 110, :height => 50, :overflow => :shrink_to_fit, :size => @t2
    pdf.text_box call_on_traits.join(", "), :at => [241, 207], :width => 110, :height => 40, :overflow => :shrink_to_fit, :size => @t2

    gear = @character['gear'] + @character['property']
    #gear = gear.map {|g| g.split(', ').join(' - ') }
    pdf.text_box gear.join(', '), :at => [30, 55], :width => 280, :size => @t2

    relationships = @character['relationships'] + @character['reputations'] + @character['affiliations']
    pdf.text_box relationships.join("\n"), :at => [5, 136], :width => 80, :size => @t2

    per_apt = 10 - @character['stats']['perception'][1]
    wil_apt = 10 - @character['stats']['will'][1]
    agi_apt = 10 - @character['stats']['agility'][1]
    spd_apt = 10 - @character['stats']['speed'][1]
    pow_apt = 10 - @character['stats']['power'][1]
    for_apt = 10 - @character['stats']['forte'][1]

    pdf.draw_text per_apt, :at => [433, 207], :size => @t2
    pdf.draw_text wil_apt, :at => [482, 207], :size => @t2
    pdf.draw_text agi_apt, :at => [539, 207], :size => @t2
    pdf.draw_text spd_apt, :at => [593, 207], :size => @t2
    pdf.draw_text pow_apt, :at => [647, 207], :size => @t2
    pdf.draw_text for_apt, :at => [699, 207], :size => @t2

    pdf.go_to_page(2)

    wil_stat = @character['stats']['will']
    per_stat = @character['stats']['perception']
    pow_stat = @character['stats']['power']
    for_stat = @character['stats']['forte']
    agi_stat = @character['stats']['agility']
    spd_stat = @character['stats']['speed']

    self.render_shade_exponent(pdf, wil_stat[0], wil_stat[1], [54, 501])
    self.render_shade_exponent(pdf, per_stat[0], per_stat[1], [54, 462])
    self.render_shade_exponent(pdf, pow_stat[0], pow_stat[1], [166, 501])
    self.render_shade_exponent(pdf, for_stat[0], for_stat[1], [166, 462])
    self.render_shade_exponent(pdf, agi_stat[0], agi_stat[1], [276.5, 501])
    self.render_shade_exponent(pdf, spd_stat[0], spd_stat[1], [276.5, 462])

    hlt_attr = @character['attributes']['health']
    stl_attr = @character['attributes']['steel']
    cir_attr = @character['attributes']['circles']
    res_attr = @character['attributes']['resources']
    ref_attr = @character['attributes']['reflexes']
    mor_attr = @character['attributes']['mortal wound']
    str_attr = @character['attributes']['stride']
    hes_attr = @character['attributes']['hesitation']

    self.render_shade_exponent(pdf, hlt_attr[0], hlt_attr[1], [52, 396.5])
    self.render_shade_exponent(pdf, stl_attr[0], stl_attr[1], [52, 351.5])
    self.render_shade_exponent(pdf, cir_attr[0], cir_attr[1], [54, 296])
    self.render_shade_exponent(pdf, res_attr[0], res_attr[1], [54, 249.5])
    self.render_shade_exponent(pdf, ref_attr[0], ref_attr[1], [279, 396.5])
    self.render_shade_exponent(pdf, mor_attr[0], mor_attr[1], [278.5, 346])

    ptgs = @character['ptgs']
    ["Su", "Li", "Mi", "Se", "Tr", "Mo"].each do |tol|
      tol_c = ptgs[tol.downcase]
      pdf.draw_text "#{tol}", :at => [29 + (19.5 * tol_c), 190], :size => @t2
    end

    pdf.draw_text str_attr[1], :at => [264, 428], :size => @t2
    pdf.draw_text hes_attr[1], :at => [53, 318], :size => @t2

    skills_left = @character['skills'][0...13]
    skills_right = @character['skills'][13...26]

    if skills_left
      skills_left.each_with_index do |s, i|
        self.render_skill(pdf, s, [372, 495 - (i*20.3)])
      end
    end

    if skills_right
      skills_right.each_with_index do |s, i|
        self.render_skill(pdf, s, [551, 495 - (i*20.3)])
      end
    end

    pdf.render
  end
end
