#! /bin/bash
git config --file .gitmodules --get-regexp path | while read path; do
  cd $(echo "$path" | awk '{print $2}')
  git pull --tags origin master
  cd ../..
done