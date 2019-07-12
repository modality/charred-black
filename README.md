# Charred Black

The unofficial, online, Burning Wheel Gold (+Codex) character burner. Adapted from [Charred](https://charred.herokuapp.com/).

## Deploy Steps

See: [Heroku - Container Registry and Runtime](https://devcenter.heroku.com/articles/container-registry-and-runtime)

```
heroku login
heroku container:login
heroku container:push web -a charred-black
heroku container:release web -a charred-black
heroku open
```

## Beliefs

I welcome community contributions, and you are welcome to fork this source code if you want to go your own way. As the maintainer,
here's what you can expect from me when I judge contributions.

### Do One Thing Well

Charred Black is a character creation utility. You are welcome to use the data, source code, or character files in the creation
of other gaming tools, but let's keep this tool focused on one thing and do it really well.

### Stick To Published Material

In order to keep the scope of my maintainership finite, I'm not planning to accept community-made lifepaths et al. for inclusion
in this codebase. Each additional data set increases Charred Black's startup time and memory requirements. The design of your lifepath
requirements and emotional attributes may not be supported by the editor, or convoluted to implement. Finally, deciding to include
community-made content would make me an arbiter of quality, and I'd prefer not to have the Enmity Clause invoked because I rejected
someone's homebrew content.

I am working on a solution for uploading lifepaths et. al which would be stored locally in your browser and not permanently on
a server. This way, you can make your data files and share them around with your friends for use with this tool. If someone else
wants to keep a repository or forum thread of data files known to work with Charred Black, I'd happily to link to it in this
documentation and from the website itself. I don't want to discourage contributions, I just want do one thing well.

### Keep It Mostly Stateless

Charred Black uses an in-memory cache to allow users to upload JSON and then download .char and .pdf files. I don't know how the
original Charred handled this, but the tradeoffs of this approach are:

1. Works as expected without an update to the frontend
2. PDF generation happens entirely in one process, limiting the amount of futzing you have to do with distributed systems
3. Because the cache is in memory, you can't scale processes horizontally

The cache has a limited number of keys, and only the first 16kb of data are used, with the aim of making this this app useless
for nefarious purposes. The average size of a 4-lifepath character is around 4kb, so this should be more than enough. If you're
trying to do something weird and your character file is bigger than this, consider using a pencil and paper.

More guidelines:

* Only JSON should be stored in the cache.
* Cached items should be invalidated upon access (by using the delete method to get the data) to restrict the usefulness of this app
  to bad actors.
* Only .pdf and .char file formats should be returned as responses when getting data out of the cache. I'll consider other formats
  on a case-by-case basis: for example, I'd be open to a format which could be used with Roll20.

## Contribution Best Practices

### Capital Case
No matter what's in the book, always use Capital Case for skills, traits, lifepaths and settings:

e.g.
Path Of Spite Subsetting
Never A Moment Of Peace
Ages Of The Etharch
Reeks Of Alcohol

Hyphens: the word after the hyphen is not capitalized:

Rabble-rouser
Burden Of The Crown-wise

### Lifepath Example

Some notes:
1. The best way to create new lifepaths is by following the same advice that Burning Wheel gives you: look at something similar that already exists and adapt it.
1. In the `stat` block below, you'd get both a mental and physical stat point for taking this lifpath. If you want either/or, use `[1, "pm"]`.


```
{
  "Example Setting": {
    "Example Lifepath": {
      "time": 1,
      "res": 1,
      "stat": [
        [
          1,
          "m"
        ],
        [
          1,
          "p"
        ]
      ],
      "skills": [
        [
          3,
          "JSON-wise"
        ],
        [
          1,
          "General"
        ]
      ],
      "traits": [
        1,
        "Plucky"
      ],
      "requires": "",
      "requires_expr": [
      ],
      "leads": [
        "Peasant",
        "Villager",
        "City",
        "Court",
        "Servitude",
        "Outcast",
        "Soldier",
        "Seafaring",
        "Religious"
      ],
      "key_leads": [
        "Peasant Setting",
        "Villager Setting",
        "City Dweller Setting",
        "Noble Court Subsetting",
        "Servitude And Captive Setting",
        "Outcast Subsetting",
        "Professional Soldier Subsetting",
        "Seafaring Setting",
        "Religious Subsetting"
      ]
    }
  }
}
```