#!/bin/bash

# Function to clone source repository, synchronize changes, and push
clone_sync_push() {
    local source_repo="$1"
    local destination_repo="$2"
    local local_path="$3"
    local repo_name="$4"

    current_date=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$current_date] Cloning, syncing, and pushing changes for $repo_name"

	# Clone the source repository
    rm -rf "$local_path"
    git clone --depth=1 "$source_repo" "$local_path"
	
    # Set write permissions for the local path
    chmod +w -R "$local_path"	

    cp "./Downloads/auto_git.log" "$local_path"
	cp "./Downloads/auto_commit.sh" "$local_path"

    (
        cd "$local_path" || exit 1
		
		# Add auto_git.log to .gitignore	
        if ! grep -q "auto_git.log" .gitignore; then
            echo "auto_git.log" >> .gitignore
		fi
		
		# Add auto_commit.sh to .gitignore	
        if ! grep -q "auto_commit.sh" .gitignore; then
            echo "auto_commit.sh" >> .gitignore
		fi

        # Set the correct remote URL for the destination repository
        git remote set-url origin "$destination_repo"

        # Fetch remote changes
        git fetch origin

        # Stash local changes
        git stash

        # Create a temporary commit without .gitignore changes
        git commit -am "Temporary commit without .gitignore changes"

        # Checkout local branch
        git checkout main

        # Merge local changes onto the latest remote changes
        git merge origin/main

        # Apply stashed changes back, excluding .gitignore
        git stash apply stash@{0}
        git checkout stash@{0} -- . ":!.gitignore"
        git stash drop stash@{0}

        # Commit changes
        git commit -am "Sync changes from stash"

        # Add files to track it
        git add -f auto_git.log
		git add -f auto_commit.sh

		# Remove or modify this condition if you want to force commit and push every time
		if true; then
			# Add all changes
			git add .

			# Commit changes
			git commit -a -m "Sync changes"

			# Push changes
			git push --force origin main
		else
			echo "No new changes to sync."
		fi
    )
}

# Repository cdn and paths
source_repo_cdn="https://github.com/ViDevs/cdn.github.io.git"
destination_repo_cdn="https://github.com/ViDevs/cdn.github.io.git"
local_path_cdn="./Downloads/cdn"

# Create the local paths if they don't exist
mkdir -p "$local_path_cdn"

# Clone, sync, and push changes for each repository
clone_sync_push "$source_repo_cdn" "$destination_repo_cdn" "$local_path_cdn" "cdn"
