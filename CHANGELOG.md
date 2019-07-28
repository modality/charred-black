# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](changelog),
and this project adheres to [Semantic Versioning](semver).

## [Unreleased]
- Add emotional attributes to the PDF
- Add a page to the pdf for Health + Steel questions
- Add a page to the pdf for trait descriptions
- Add weapon info to the pdf based on some educated guesses (e.g. do you have the arms resource and the Spear skill?)
- Write a guide on creating your own JSON data files
- Custom upload for your own data files
- Updates to Roden and Great Wolves files (currently the data comes from Monster Burner and not Codex)

## [2.2.1] - 2019-07-28
### Fixed
- Wizard's Apprentice should count as Neophyte Sorcerer, and Junior Student counts as Arcane Devotee and Neophyte Sorcerer (thanks StubbsPKS!)

## [2.2.0] - 2019-07-14
### Added
- Added the Troll stock.
- Dark Elf Spite calculations include "Bitter Reminders"

### Changed
- Wizard trait "Misunderstood" was renamed to "Outsider" to avoid conflict with Roden trait of the same name
- Added a `verbose_merge` method to surface trait and skill conflicts.

## [2.1.1] - 2019-07-14
### Changed
- Traits on PDF are now just a comma-delimited list (instead of newline) and shrink to fit in the appropriate space
- Fix a typo in Dark Elf lifepaths

## [2.1.0] - 2019-07-11
### Added
- Dark Elf lifepaths and Spite emotional attribute.
- README.md and CHANGELOG.md

### Changed
- Spite is calculated using the Grief value, this required some updates to stat calculation to prevent an infinite loop.

## [2.0.1] - 2019-07-10
### Fixed
- First Mate LP is now selectable with 2 seafaring LPs. Previously: if Son of a Gun was the first LP, it was not selectable. Example: Son of a Gun -> Officer's Mate -> First Mate. (thanks Dave's Not Here!)

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