import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartyBinMasterComponent } from './party-bin-master.component';

describe('PartyBinMasterComponent', () => {
  let component: PartyBinMasterComponent;
  let fixture: ComponentFixture<PartyBinMasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartyBinMasterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PartyBinMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
