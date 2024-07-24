rsync -avz -e "ssh -i /Users/edujlac/Documents/RLabs/login.pem" --exclude="node_modules" -r /Users/edujlac/Documents/RLabs/movies-app/movies-app-back ec2-user@ec2-3-17-153-230.us-east-2.compute.amazonaws.com:/home/ec2-user/RLabs

pm2 start npm --name movies-app-backend -- run dev
pm2 start npm --name movies-app-front -- run dev

ssh -i login.pem ec2-user@ec2-3-17-153-230.us-east-2.compute.amazonaws.com