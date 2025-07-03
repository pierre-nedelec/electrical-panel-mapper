find src -name "*.js" | while read file; do echo "// $file"; cat "$file"; echo ""; done | pbcopy
