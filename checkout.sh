#! /bin/bash
git config --file .gitmodules --get-regexp path | while read path; do
  cd $(echo "$path" | awk '{print $2}')
  git checkout -q master
  cd ../..
done

# git config --file=.gitmodules $(echo "$url" | sed -E "s/git@github.com:|https:\/\/github.com\//https:\/\/${{ secrets.PAT_TOKEN }}:${{ secrets.PAT_TOKEN }}@github.com\//")
# git submodule status
# git submodule update --recursive --remote

# git checkout -q master
# git checkout -q duc-dev/bookingScreen
# > git for-each-ref --format %(refname:short)%00%(upstream:short) refs/heads
# > git status -z -u
# > git symbolic-ref --short HEAD
# > git for-each-ref --format=%(refname)%00%(upstream:short)%00%(upstream:track)%00%(objectname) refs/heads/master refs/remotes/master
# > git for-each-ref --sort -committerdate --format %(refname) %(objectname) %(*objectname)
# > git remote --verbose
# > git config --get commit.template

# git submodule update --remote --checkout modules/mod-translations
# git submodule update --remote --checkout -q master modules/unitz-assets
# git submodule set-branch master modules/unitz-assets