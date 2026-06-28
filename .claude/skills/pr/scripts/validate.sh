#!/bin/bash

branch=$(git branch --show-current)

# Нельзя создавать PR из main или develop
if [[ "$branch" == "main" || "$branch" == "develop" ]]; then
  echo "❌ Error: You cannot create a PR from the '$branch' branch."
  echo "Please create branch: git checkout -b feature/your-feature-name"
  exit 1
fi

# Определяем базовую ветку: локальный main, иначе origin/main
if git show-ref --verify --quiet refs/heads/main; then
  base=main
elif git show-ref --verify --quiet refs/remotes/origin/main; then
  base=origin/main
else
  echo "❌ Error: Base branch 'main' not found locally or on 'origin'."
  exit 1
fi

# Проверим что есть коммиты отличные от базовой ветки
commits=$(git log "$base..HEAD" --oneline | wc -l | tr -d ' ')

if [[ "$commits" -eq 0 ]]; then
  echo "❌ Error: No commits found on branch '$branch' that are not in '$base'."
  exit 1
fi
echo "✅ Validation passed: Branch '$branch' has $commits commit(s) that are not in '$base'."
exit 0
