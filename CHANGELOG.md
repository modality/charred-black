# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](changelog),
and this project adheres to [Semantic Versioning](semver).

## [Unreleased]
- Dark Elf - Bitter Reminders rules
- Troll stock
- Add emotional attributes to the PDF
- Add a page to the pdf for Health + Steel questions
- Add a page to the pdf for trait descriptions
- Add weapon info to the pdf based on some educated guesses (e.g. do you have the arms resource and the Spear skill?)
- Write a guide on creating your own JSON data files
- Custom upload for your own data files
- Updates to Roden and Great Wolves files (currently the data comes from Monster Burner and not Codex)

## [2.1.0] - 2019-07-11
### Added
- Dark Elf lifepaths and Spite emotional attribute.
- README.md and CHANGELOG.md

### Changed
- Spite is calculated using the Grief value, and this required some updates to the 

## [2.0.1] - 2019-07-10
### Fixed
- First Mate LP is now selectable with 2 seafaring LPs. Previously: if Son of a Gun was the first LP, it was not selectable. Example: Son of a Gun -> Officer's Mate -> First Mate.

## [2.0.0] - 2019-07-09
### Added
- Use the Gold character sheet
- Display the trait descriptions next to the traits
- Added the Wizard Burner lifepaths
- Updated the color scheme so you know you're using the new one

### Changed
- Charred Black release. Most of the frontend code is the same as Charred, but the backend is completely rewritten (out of necessity).
- Emotional attributes are calculated but not yet shown on the character sheet.


[changelog]: https://keepachangelog.com/en/1.0.0/
[semver]: https://semver.org/spec/v2.0.0.html