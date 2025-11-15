import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { FriendsService } from '../../services/friends.service';
import { UserSearchComponent } from '../user-search/user-search.component';
import { FriendsListComponent } from '../friends-list/friends-list.component';
import { FriendRequestsComponent } from '../friend-requests/friend-requests.component';

@Component({
  selector: 'app-friends-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    UserSearchComponent,
    FriendsListComponent,
    FriendRequestsComponent,
  ],
  templateUrl: './friends-page.component.html',
  styleUrl: './friends-page.component.scss',
})
export class FriendsPageComponent implements OnInit {
  private friendsService = inject(FriendsService);

  readonly selectedTab = signal(0);

  ngOnInit(): void {
    // Component initialization
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
  }
}

