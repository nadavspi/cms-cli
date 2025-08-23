#!/usr/bin/env fish

set file (fd -e md . "/Users/nadavspi/Documents/Archive/10-19 Personal documents/18 Notes" | fzf)

npm start "$file"

